#include <iostream>
#include <climits>
#include <string>

#include <cuimg/improved_builtin.h>
#include <cuimg/copy.h>

#include <cuimg/cpu/host_image2d.h>
#include <cuimg/tracking2/tracker.h>
#include <cuimg/dsl/get_comp.h>

using namespace cuimg;

typedef tracker<tracking_strategies::bc2s_miel3_gradient_cpu> VideoTracker;

VideoTracker* tr = 0;


i_uchar3 speed_to_color(i_float2 speed, float div)
{
  float module = norml2(speed);

  float R = ::abs(2 * speed.x + module) / div;
  float G = ::abs(-speed.x - speed.y + module) / div;
  float B = ::abs(2 * speed.y + module) / div;

  R = R < 0.f ? 0.f : R;
  G = G < 0.f ? 0.f : G;
  B = B < 0.f ? 0.f : B;
  i_float3 c(R, G, B);

  if (R > 1.f) c /= R;
  if (G > 1.f) c /= G;
  if (B > 1.f) c /= B;

  return i_uchar3(c.x * 255, c.y * 255, c.z * 255);
}

extern "C"
{
  void set_threshold(int n)
  {
    if (not tr) return;
    tr->scale(0).strategy().detector().set_contrast_threshold(n);
    tr->scale(1).strategy().detector().set_contrast_threshold(n);
    tr->scale(2).strategy().detector().set_contrast_threshold(n);
    tr->scale(3).strategy().detector().set_contrast_threshold(n);
  }

  void get_frame(int data, unsigned width, unsigned height)
  {
    if (!tr || tr->domain().nrows() != height || tr->domain().ncols() != width)
    {
      tr = new VideoTracker(obox2d(height, width), 4);
      int th = 10;

      tr->strategy().set_detector_frequency(3);
      tr->strategy().set_filtering_frequency(1);

      tr->scale(0).strategy().detector().set_contrast_threshold(20);
      tr->scale(1).strategy().detector().set_contrast_threshold(10);
      tr->scale(2).strategy().detector().set_contrast_threshold(10);
      tr->scale(3).strategy().detector().set_contrast_threshold(10);
    }

    host_image2d<i_uchar4> frame((i_uchar4*) data, height, width, width * 4);
    host_image2d<gl8u> frame_gl(height, width);

    frame_gl = get_x(frame);
    tr->run(frame_gl);
  }

  int get_points(int buf, int maxsize)
  {
    i_short2* b = (i_short2*) buf;

    int i = 0;
    for (auto& p : tr->scale(0).pset().dense_particles())
    {
      if (i < maxsize && p.age > 0)
      {
	b[i].x = p.pos.x;
	b[i].y = p.pos.y;
	i++;
      }
    }
    return i;
  }

  int get_vectors(int buf, int maxsize)
  {
    i_short2* b = (i_short2*) buf;

    int i = 0;
    for (auto& p : tr->scale(0).pset().dense_particles())
    {
      if (i < maxsize and p.age > 0)
      {
	b[i] = p.speed;
	i++;
      }
    }
    return i;
  }

  int get_flow_colors(int buf, int maxsize)
  {
    i_uchar3* b = (i_uchar3*) buf;

    int i = 0;
    for (auto& p : tr->scale(0).pset().dense_particles())
    {
      if (i < maxsize and p.age > 0)
      {
	b[i] = speed_to_color(p.speed, 10);
	i++;
      }
    }
    return i;
  }

}
